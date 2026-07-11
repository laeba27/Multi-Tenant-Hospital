'use client'

/**
 * The bookable blocks for a doctor on a date, colour-coded.
 *
 *   green   available    -- room left, click to book
 *   yellow  full         -- capacity reached, NOT bookable
 *   red     unavailable  -- leave, holiday, break, or outside the shift
 *
 * `showCapacity` is the one difference between the two audiences: reception
 * sees "3/5 booked", a patient sees only the colour. A patient has no business
 * knowing how full a doctor's afternoon is.
 */
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
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-400">Checking availability…</p>
      </div>
    )
  }

  if (!slots.length) {
    return (
      <div className="rounded-lg border border-rose-100 bg-rose-50 p-6 text-center">
        <p className="text-sm text-rose-700">{reason || 'No slots available on this date.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((s) => {
          const selected = value === s.slot
          const style = selected
            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
            : s.state === 'available'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100'
              : s.state === 'full'
                ? 'bg-amber-50 text-amber-900 border-amber-200 cursor-not-allowed'
                : 'bg-rose-50 text-rose-900 border-rose-200 cursor-not-allowed'

          return (
            <button
              key={s.slot}
              type="button"
              disabled={disabled || !s.bookable}
              onClick={() => s.bookable && onChange?.(s.slot)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${style} ${
                disabled ? 'opacity-60' : ''
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">{s.label}</span>

              <span className="block text-[11px] mt-0.5 opacity-80">
                {s.state === 'available'
                  ? showCapacity
                    ? `${s.taken}/${s.capacity} booked`
                    : 'Available'
                  : s.state === 'full'
                    ? showCapacity
                      ? `Full — ${s.taken}/${s.capacity}`
                      : 'Full'
                    : 'Unavailable'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Unavailable
        </span>
      </div>
    </div>
  )
}
