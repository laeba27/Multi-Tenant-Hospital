'use client'

import { useEffect, useRef, useState } from 'react'
import { searchPatientForHospital } from '@/actions/patients'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Search, UserPlus, X } from 'lucide-react'

/**
 * Find an existing patient before booking.
 *
 * Shaped like a search box with a dropdown, because that is the interaction
 * reception already knows: type, glance at a short list, pick. Matches appear
 * in an overlay rather than pushing the rest of the dialog down, and the list
 * scrolls once it exceeds ~5 rows so a common surname cannot stretch the modal
 * off-screen.
 *
 * "Register new patient" sits beside the field, in green: when the search comes
 * up empty that is the only way forward, and it was previously buried at the
 * bottom behind a divider.
 *
 * The search itself accepts any identifier -- hospital patient ID, global
 * registration number, name, phone, email -- so nobody has to classify what
 * they are holding before typing it.
 */
export function PatientLookup({ hospitalId, onSelectPatient, onCreateNew, isLoading: externalLoading }) {
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef(null)
  const boxRef = useRef(null)
  const listRef = useRef(null)

  // Ignore responses from a superseded keystroke, so a slow early request
  // cannot land after a faster later one and show stale matches.
  const requestRef = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close the dropdown on an outside click.
  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const term = searchValue.trim()

    if (term.length < 2) {
      setResults([])
      setSearched(false)
      setIsLoading(false)
      setOpen(false)
      return
    }

    setIsLoading(true)
    const ticket = ++requestRef.current

    // Debounced so typing a full ID is one query, not fourteen.
    const timer = setTimeout(async () => {
      try {
        const found = await searchPatientForHospital(hospitalId, term)
        if (ticket !== requestRef.current) return
        setResults(found || [])
        setSearched(true)
        setOpen(true)
        setActiveIndex(-1)
      } catch (error) {
        if (ticket !== requestRef.current) return
        console.error('Search error:', error)
        toast.error('Could not search for patients')
        setResults([])
        setSearched(true)
        setOpen(true)
      } finally {
        if (ticket === requestRef.current) setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, hospitalId])

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    listRef.current.querySelectorAll('[data-row]')[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const choose = (patient) => {
    setOpen(false)
    onSelectPatient(patient)
  }

  const onKeyDown = (e) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      choose(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const term = searchValue.trim()
  const showEmpty = open && searched && !isLoading && results.length === 0 && term.length >= 2

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        {/* Search field + dropdown */}
        <div ref={boxRef} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => term.length >= 2 && searched && setOpen(true)}
            placeholder="Search by patient ID, name, phone or email"
            className="pl-9 pr-9"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls="patient-results"
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          ) : (
            searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  inputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}

          {/* Dropdown. Absolute so it overlays the dialog instead of resizing
              it, and capped in height so long result sets scroll. */}
          {open && (results.length > 0 || showEmpty) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
              {results.length > 0 ? (
                <ul
                  id="patient-results"
                  ref={listRef}
                  role="listbox"
                  className="max-h-72 divide-y overflow-y-auto"
                >
                  {results.map((patient, i) => (
                    <li key={patient.id}>
                      <button
                        type="button"
                        data-row
                        role="option"
                        aria-selected={i === activeIndex}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => choose(patient)}
                        disabled={externalLoading}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition disabled:opacity-50 ${
                          i === activeIndex ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                          {(patient.profile?.name || '?')
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {patient.profile?.name || 'Unnamed patient'}
                          </span>
                          {/* Both identifiers, so whichever one was searched is
                              visible on the row about to be picked. */}
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[11px] text-gray-500">
                            <span className="font-mono">{patient.id}</span>
                            {patient.profile?.registration_no && (
                              <span className="font-mono">{patient.profile.registration_no}</span>
                            )}
                            {patient.profile?.mobile && <span>{patient.profile.mobile}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-600">
                    No match for <span className="font-medium">&ldquo;{term}&rdquo;</span>
                  </p>
                  <button
                    type="button"
                    onClick={onCreateNew}
                    className="mt-1 text-sm font-medium text-emerald-700 hover:underline"
                  >
                    Register them as a new patient
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* The way forward when the search finds nothing, so it stays visible
            next to the field rather than below the results. */}
        <Button
          onClick={onCreateNew}
          disabled={externalLoading}
          className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Register new
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Try <span className="font-mono text-gray-700">HOSP-PAT-59588</span>,{' '}
        <span className="font-mono text-gray-700">PATIENT-628032</span>, a name, or a phone number.
        Partial entries work.
      </p>
    </div>
  )
}
