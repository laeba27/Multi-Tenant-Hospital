'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check } from 'lucide-react'

/**
 * The bookable blocks for a doctor on a date, as a single dropdown.
 *
 * A grid of blocks grew unusable once doctors ran long shifts -- a 12-hour day
 * at 30-minute steps is 24 tiles, which pushed the rest of the form off-screen.
 * One control, fixed height, however long the shift.
 *
 *   green   available    -- room left, click to book
 *   yellow  full         -- capacity reached, NOT bookable
 *   red     unavailable  -- leave, holiday, break, or outside the shift
 *
 * `showCapacity` is the one difference between the two audiences: reception
 * sees "3/5 booked", a patient sees only the colour. A patient has no business
 * knowing how full a doctor's afternoon is.
 */

const DOT = {
  available: 'bg-emerald-500',
  full: 'bg-amber-500',
  unavailable: 'bg-rose-500',
}

export default function SlotPicker({
  slots = [],
  value,
  onChange,
  loading = false,
  reason = null,
  showCapacity = false,
  disabled = false,
}) {
  if (loading) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" />
        <p className="text-sm text-gray-400">Checking availability…</p>
      </div>
    )
  }

  if (!slots.length) {
    return (
      <div className="flex h-9 items-center rounded-md border border-rose-200 bg-rose-50 px-3">
        <p className="truncate text-xs text-rose-700">{reason || 'No slots available on this date.'}</p>
      </div>
    )
  }

  const openCount = slots.filter((s) => s.bookable).length
  const selected = slots.find((s) => s.slot === value)

  return (
    <div className="space-y-1.5">
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue
            placeholder={
              openCount === 0 ? 'No slots free — pick another date' : `Select a time (${openCount} free)`
            }
          >
            {selected && (
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[selected.state]}`} />
                <span className="font-medium">{selected.label}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="max-h-72">
          {slots.map((s) => (
            <SelectItem
              key={s.slot}
              value={s.slot}
              disabled={!s.bookable}
              // The check lives in the row itself, so the default indicator
              // would only crowd an already-tight line.
              className="pl-2 [&>span:first-child]:hidden"
            >
              <div className="flex w-full items-center gap-2 pr-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[s.state]}`} />
                <span className={`flex-1 text-sm ${s.bookable ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s.label}
                </span>
                <span
                  className={`shrink-0 text-[11px] tabular-nums ${
                    s.state === 'available'
                      ? 'text-emerald-600'
                      : s.state === 'full'
                        ? 'text-amber-600'
                        : 'text-rose-500'
                  }`}
                >
                  {s.state === 'available'
                    ? showCapacity
                      ? `${s.taken}/${s.capacity}`
                      : 'Free'
                    : s.state === 'full'
                      ? showCapacity
                        ? `Full ${s.taken}/${s.capacity}`
                        : 'Full'
                      : 'Unavailable'}
                </span>
                {value === s.slot && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Unavailable
        </span>
      </div>
    </div>
  )
}
