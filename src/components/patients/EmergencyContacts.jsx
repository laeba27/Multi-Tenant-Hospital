'use client'

import { Phone, Ambulance, Flame, Shield, HeartPulse, Building2 } from 'lucide-react'
import { Section } from '@/components/patients/portal-ui'

// India national emergency numbers. Static -- these don't change per patient.
const NATIONAL = [
  { icon: HeartPulse, label: 'All-in-one Emergency', number: '112', tone: 'text-rose-600 bg-rose-50' },
  { icon: Ambulance, label: 'Ambulance', number: '108', tone: 'text-red-600 bg-red-50' },
  { icon: Shield, label: 'Police', number: '100', tone: 'text-blue-600 bg-blue-50' },
  { icon: Flame, label: 'Fire', number: '101', tone: 'text-orange-600 bg-orange-50' },
]

function ContactCard({ icon: Icon, label, number, tone, sub }) {
  return (
    <a
      href={`tel:${number}`}
      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
        {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-1 text-indigo-600 shrink-0">
        <Phone className="h-3.5 w-3.5" />
        <span className="text-sm font-bold tracking-wide">{number}</span>
      </div>
    </a>
  )
}

/**
 * @param {Array} hospitals - the patient's registered hospital records
 *   (from getMyHospitalRecords), used to surface each hospital's own phone.
 */
export default function EmergencyContacts({ hospitals = [] }) {
  const hospitalContacts = hospitals
    .map((r) => ({
      name: r.hospital?.name || r.hospital_id,
      phone: r.hospital?.phone,
      location: [r.hospital?.city, r.hospital?.state].filter(Boolean).join(', '),
    }))
    .filter((h) => h.phone)

  return (
    <Section title="Emergency Contacts" icon={Phone}>
      <div className="space-y-2">
        {NATIONAL.map((c) => <ContactCard key={c.number} {...c} />)}

        {hospitalContacts.map((h) => (
          <ContactCard
            key={`${h.name}-${h.phone}`}
            icon={Building2}
            label={h.name}
            sub={h.location}
            number={h.phone}
            tone="text-indigo-600 bg-indigo-50"
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-400">
        In a life-threatening emergency, call 112 or go to the nearest emergency room.
      </p>
    </Section>
  )
}
