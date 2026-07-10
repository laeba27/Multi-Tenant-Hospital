'use client'

import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { getMyHospitalRecords } from '@/actions/patients'
import { Section, Empty, HospitalCard } from '@/components/patients/portal-ui'

export default function MyHospitalsView() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMyHospitalRecords().then((res) => {
      if (cancelled) return
      if (res.success) setRecords(res.records)
      else toast.error(res.error || 'Failed to load your hospitals')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading your hospitals…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Hospitals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every hospital where you have a patient record. One login covers them all.
        </p>
      </div>

      <Section title={`Registered Hospitals (${records.length})`} icon={Building2}>
        {records.length === 0 ? (
          <Empty>You are not registered at any hospital yet.</Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {records.map((r) => <HospitalCard key={r.id} record={r} />)}
          </div>
        )}
      </Section>
    </div>
  )
}
