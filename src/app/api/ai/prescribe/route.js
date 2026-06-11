import { NextResponse } from 'next/server'
import { buildPrescriptionDraft } from '@/lib/ai/extraction'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let appointmentId = ''
    let transcriptOverride = ''
    let audioFile = null
    let hasTranscriptOverride = false

    if (contentType.includes('application/json')) {
      const body = await request.json()
      appointmentId = body?.appointmentId || ''
      hasTranscriptOverride = Object.prototype.hasOwnProperty.call(body || {}, 'transcript')
      transcriptOverride = hasTranscriptOverride ? body?.transcript || '' : ''
      audioFile = body?.audio || null
    } else {
      const formData = await request.formData()
      hasTranscriptOverride = formData.has('transcript')
      transcriptOverride = hasTranscriptOverride ? formData.get('transcript') || '' : ''
      appointmentId = formData.get('appointmentId') || ''
      audioFile = formData.get('audio')
    }

    let transcript = ''

    if (hasTranscriptOverride) {
      transcript = transcriptOverride.trim()

      if (!transcript) {
        return NextResponse.json(
          { error: 'Transcript override cannot be empty' },
          { status: 400 }
        )
      }
    } else {
      if (!audioFile || typeof audioFile === 'string') {
        return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
      }

      if (typeof audioFile.size === 'number' && audioFile.size === 0) {
        return NextResponse.json({ error: 'Audio file is empty' }, { status: 400 })
      }

      const pythonUrl = process.env.AI_TRANSCRIBE_URL || 'http://localhost:8001/transcribe'
      const forwardForm = new FormData()
      forwardForm.append('file', audioFile, audioFile.name || 'audio.webm')

      let data = null
      try {
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

        data = await response.json()
      } catch (err) {
        console.error('Transcription service error:', err)
        return NextResponse.json(
          {
            error: 'Transcription service unavailable',
            details: String(err?.message || err),
            hint: 'Start the local Whisper service at backend/ai_service or send a transcript override instead.',
          },
          { status: 503 }
        )
      }

      transcript = data?.text || data?.transcript || ''

      if (!transcript) {
        return NextResponse.json(
          { error: 'Transcription produced empty result', details: data || null },
          { status: 502 }
        )
      }
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
