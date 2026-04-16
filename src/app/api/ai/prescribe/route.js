import { NextResponse } from 'next/server'
import { buildPrescriptionDraft } from '@/lib/ai/extraction'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const transcriptOverride = formData.get('transcript')
    const appointmentId = formData.get('appointmentId')
    let transcript = ''

    if (transcriptOverride) {
      transcript = String(transcriptOverride)
    } else {
      const audioFile = formData.get('audio')

      if (!audioFile) {
        return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
      }

      const pythonUrl = process.env.AI_TRANSCRIBE_URL || 'http://localhost:8001/transcribe'
      const forwardForm = new FormData()
      forwardForm.append('file', audioFile, audioFile.name || 'audio.webm')

      const response = await fetch(pythonUrl, {
        method: 'POST',
        body: forwardForm,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { error: 'Transcription failed', details: errorText },
          { status: 502 }
        )
      }

      const data = await response.json()
      transcript = data.text || data.transcript || ''
    }

    const structured = buildPrescriptionDraft({ transcript })

    return NextResponse.json({
      appointmentId,
      transcript,
      structured,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process AI prescription', details: error.message },
      { status: 500 }
    )
  }
}
