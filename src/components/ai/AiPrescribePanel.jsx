'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { buildPrescriptionDraft } from '@/lib/ai/extraction'

export function AiPrescribePanel({ appointmentId }) {
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState([])
  const [transcript, setTranscript] = useState('')
  const [structured, setStructured] = useState(null)
  const [originalTranscript, setOriginalTranscript] = useState('')
  const [originalStructured, setOriginalStructured] = useState(null)
  const [extractionMode, setExtractionMode] = useState('')
  const [extractionWarning, setExtractionWarning] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const extractFromTranscript = async (rawTranscript, preserveOriginal = false) => {
    const text = String(rawTranscript || '').trim()
    if (!text) {
      throw new Error('Transcript is empty')
    }

    const formData = new FormData()
    formData.append('transcript', text)
    formData.append('appointmentId', appointmentId)

    const response = await fetch('/api/ai/prescribe', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const payload = await response.json()
      throw new Error(payload?.error || 'Failed to extract structured fields')
    }

    const payload = await response.json()
    const draft = payload?.structured || buildPrescriptionDraft({ transcript: text })
    setTranscript(text)
    setStructured(draft)
    setExtractionMode(payload?.extractionMode || '')
    setExtractionWarning(payload?.extractionWarning || '')

    if (preserveOriginal || !originalStructured) {
      setOriginalTranscript(text)
      setOriginalStructured(draft)
    }
  }

  const addRecording = (blob, sourceLabel = 'recording') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const url = URL.createObjectURL(blob)
    setRecordings((prev) => [
      ...prev,
      {
        id,
        blob,
        url,
        sourceLabel,
        transcript: '',
        status: 'idle',
        error: '',
      },
    ])
  }

  const startRecording = async () => {
    setError('')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    const recorder = new MediaRecorder(stream)
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      addRecording(blob, 'mic recording')
      stream.getTracks().forEach((track) => track.stop())
    }

    recorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder) {
      recorder.stop()
      setIsRecording(false)
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => addRecording(file, 'uploaded file'))
    event.target.value = ''
  }

  const transcribeRecording = async (recording) => {
    setRecordings((prev) =>
      prev.map((item) =>
        item.id === recording.id
          ? { ...item, status: 'processing', error: '' }
          : item
      )
    )

    try {
      const formData = new FormData()
      formData.append('audio', recording.blob, 'appointment-audio.webm')
      formData.append('appointmentId', appointmentId)

      const response = await fetch('/api/ai/prescribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload?.error || 'Failed to transcribe audio')
      }

      const payload = await response.json()
      const nextTranscript = payload.transcript || ''
      setRecordings((prev) =>
        prev.map((item) =>
          item.id === recording.id
            ? { ...item, transcript: nextTranscript, status: 'done' }
            : item
        )
      )
    } catch (err) {
      setRecordings((prev) =>
        prev.map((item) =>
          item.id === recording.id
            ? { ...item, status: 'error', error: err.message || 'Failed' }
            : item
        )
      )
    }
  }

  const handleTranscribeAll = async () => {
    if (recordings.length === 0) {
      setError('Record audio or upload a file first.')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      for (const recording of recordings) {
        if (!recording.transcript) {
          await transcribeRecording(recording)
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCombineTranscripts = () => {
    const combined = recordings
      .map((item) => item.transcript)
      .filter(Boolean)
      .join('\n')

    if (!combined) {
      setError('No transcripts available to combine.')
      return
    }

    setIsProcessing(true)
    setError('')
    extractFromTranscript(combined, true)
      .catch((err) => {
        setError(err.message || 'Failed to combine and extract')
      })
      .finally(() => {
        setIsProcessing(false)
      })
  }

  const handleReextract = () => {
    setIsProcessing(true)
    setError('')
    extractFromTranscript(transcript, false)
      .catch((err) => {
        setError(err.message || 'Failed to re-extract')
      })
      .finally(() => {
        setIsProcessing(false)
      })
  }

  const handleSaveDraft = async () => {
    if (!structured || !appointmentId) {
      setError('No draft to save')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/ai/prescribe/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          transcript,
          structured,
          originalTranscript: originalTranscript || transcript,
          originalStructured: originalStructured || structured,
          extractionMode,
          extractionWarning,
        }),
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload?.error || 'Failed to save draft')
      }

      const payload = await response.json()
      alert(`✅ Draft saved! Prescription ID: ${payload.prescriptionId}`)
    } catch (err) {
      setError(err.message || 'Failed to save draft')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveRecording = (recordingId) => {
    setRecordings((prev) => {
      const next = prev.filter((item) => item.id !== recordingId)
      const removed = prev.find((item) => item.id === recordingId)
      if (removed?.url) {
        URL.revokeObjectURL(removed.url)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audio Capture</CardTitle>
          <CardDescription>Record or upload the consultation audio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? 'Stop recording' : 'Start recording'}
            </Button>
            <label className="text-sm text-gray-600">
              <input type="file" accept="audio/*" multiple onChange={handleFileUpload} />
            </label>
            <Button variant="outline" onClick={handleTranscribeAll} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Transcribe all recordings'}
            </Button>
            <Button variant="outline" onClick={handleCombineTranscripts} disabled={isProcessing}>
              Combine & extract
            </Button>
          </div>
          {recordings.length > 0 && (
            <div className="space-y-3">
              {recordings.map((recording, index) => (
                <Card key={recording.id} className="border border-gray-100">
                  <CardContent className="space-y-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span>
                        Clip {index + 1} · {recording.sourceLabel}
                      </span>
                      <span>
                        {recording.status === 'processing'
                          ? 'Transcribing...'
                          : recording.status === 'done'
                          ? 'Ready'
                          : recording.status === 'error'
                          ? 'Error'
                          : 'Pending'}
                      </span>
                    </div>
                    <audio controls className="w-full">
                      <source src={recording.url} />
                    </audio>
                    {recording.transcript && (
                      <p className="text-xs text-gray-600">
                        {recording.transcript}
                      </p>
                    )}
                    {recording.error && (
                      <p className="text-xs text-rose-600">{recording.error}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => transcribeRecording(recording)}
                        disabled={recording.status === 'processing' || isProcessing}
                      >
                        Transcribe clip
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveRecording(recording.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>Review and edit the transcript before extraction.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Transcript will appear here..."
            rows={6}
          />
          <Button variant="outline" onClick={handleReextract}>
            Re-extract fields
          </Button>
          {(extractionMode || extractionWarning) && (
            <p className="text-xs text-gray-500">
              Mode: {extractionMode || 'unknown'}
              {extractionWarning ? ` | Warning: ${extractionWarning}` : ''}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Structured Draft</CardTitle>
          <CardDescription>AI-prefilled JSON that will map to the prescription.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-xs text-gray-700 overflow-auto max-h-96">
            {structured ? JSON.stringify(structured, null, 2) : 'No structured data yet.'}
          </pre>
          <div className="flex gap-3">
            <Button 
              onClick={handleSaveDraft} 
              disabled={!structured || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Saving...' : 'Save as Draft'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
