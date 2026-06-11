import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AiPrescribePanel } from '@/components/ai/AiPrescribePanel'

export const metadata = {
  title: 'AI Prescription Draft',
  description: 'Generate a draft prescription from AI-assisted inputs.',
}

export default async function AiPrescriptionPage({ params }) {
  const { id: appointmentId } = await params

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Prescribe</h1>
          <p className="text-sm text-gray-600">
            Appointment <span className="font-mono">{appointmentId}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/doctor/appointments/${appointmentId}/prescribe`}>
            Back to appointment
          </Link>
        </Button>
      </div>

      <AiPrescribePanel appointmentId={appointmentId} />
    </div>
  )
}
