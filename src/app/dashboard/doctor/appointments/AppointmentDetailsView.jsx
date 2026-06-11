'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AppointmentCustomPrescriptionComposer } from '@/components/prescriptions/AppointmentCustomPrescriptionComposer'
import { ChevronLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function AppointmentDetailsView({
  appointmentData,
  composerData = null,
  dbTemplates = [],
  appointmentId,
  showPrescriptionComposer = true,
}) {
  const { appointment, prescriptions, appointmentStatus, hasPrescription, existingRows, existingTemplateId } =
    appointmentData
  const patient = appointment?.patient || {}

  const statusColors = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    draft: 'bg-sky-50 text-sky-700 ring-sky-200',
    issued: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amended: 'bg-violet-50 text-violet-700 ring-violet-200',
    cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const initials = (patient.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <div className="bg-slate-50/60 rounded-lg">
      {/* Top bar — flat, dense */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-11 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/dashboard/doctor/appointments">
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1 text-slate-500 hover:text-slate-900">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-[14px] font-semibold text-slate-900 tracking-tight uppercase">
              Prescription
            </h1>
            <span className="text-slate-300">·</span>
            <span className="text-[13px] text-slate-500 font-mono truncate">
              {appointmentId}
            </span>
            {appointmentStatus && (
              <Badge
                className={`ml-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset border-0 px-2 py-0 h-5 ${
                  statusColors[appointmentStatus] || 'bg-slate-50 text-slate-600 ring-slate-200'
                }`}
              >
                {appointmentStatus}
              </Badge>
            )}
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
          >
            <Link href={`/dashboard/doctor/ai/${appointmentId}/prescribe/ai`}>
              <Sparkles className="h-4 w-4" />
              AI Assist
            </Link>
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
        {/* Patient strip — single dense row */}
        <div className="bg-white border border-slate-200 rounded-md">
          <div className="flex items-stretch divide-x divide-slate-200">
            {/* Identity */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 min-w-0 flex-1">
              <div className="h-9 w-9 rounded bg-slate-900 text-white flex items-center justify-center shrink-0 text-[12px] font-semibold tracking-tight">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-slate-900 truncate leading-tight uppercase">
                  {patient.name || 'Unknown patient'}
                </div>
                <div className="text-[12px] text-slate-500 font-mono leading-tight mt-0.5">
                  {patient.registrationNo || 'N/A'}
                </div>
              </div>
            </div>

            {/* Meta cells */}
            <Cell label="Email" value={patient.email} mono />
            <Cell label="Phone" value={patient.mobile} mono />
            <Cell label="Department" value={appointment?.department || 'Consultation'} />
            <Cell label="Date" value={formatDate(appointment?.appointmentDate)} />
          </div>

          {appointment?.reason && (
            <div className="border-t border-slate-200 px-3 py-2 flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Complaint
              </span>
              <span className="text-[13px] text-slate-700 truncate capitalize">
                {appointment.reason}
              </span>
            </div>
          )}
        </div>

        {/* Composer */}
        {showPrescriptionComposer && (
          <AppointmentCustomPrescriptionComposer
            appointmentId={appointmentId}
            appointment={appointment}
            patient={patient}
            patientId={patient.id}
            doctor={composerData?.doctor}
            hospital={composerData?.hospital}
            dbTemplates={dbTemplates}
            hasExistingPrescription={hasPrescription}
            existingRows={existingRows}
            existingTemplateId={existingTemplateId}
            onSubmit={(data) => {
              console.log('Prescription submitted:', data)
            }}
          />
        )}
      </div>
    </div>
  )
}

function Cell({ label, value, mono = false, caps = true }) {
  return (
    <div className="px-3 py-2.5 min-w-0 hidden md:flex flex-col justify-center">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold leading-tight">
        {label}
      </div>
      <div
        className={`text-[13px] text-slate-800 truncate leading-tight mt-1 ${
          mono ? 'font-mono' : caps ? 'capitalize' : ''
        }`}
      >
        {value || '—'}
      </div>
    </div>
  )
}
