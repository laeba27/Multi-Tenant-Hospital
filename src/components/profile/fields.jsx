'use client'

/**
 * Shared building blocks for the profile screens.
 *
 * The profile page previously repeated the same long Tailwind string on every
 * one of its ~20 inputs ("w-full px-4 py-2 border border-gray-300 rounded-lg
 * focus:ring-2 focus:ring-indigo-500 focus:border-transparent"), which is why
 * the fields had drifted apart -- some px-3, some px-4, some with a focus ring
 * and some without. Defining each control once here means every profile, for
 * every role, is laid out identically, and a change lands everywhere at once.
 *
 * The visual language is deliberately plain: hairline borders, one accent
 * colour (the brand blue), generous label/value spacing, no drop shadows and
 * no coloured panels. On a screen that is mostly read rather than clicked,
 * restraint reads as "standard" -- the ornament was what made it look off.
 */

/** A titled block of the form, with an optional short description. */
export function Section({ title, description, children, className = '' }) {
  return (
    <section className={className}>
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Two-column responsive grid used by every field group. */
export function FieldGrid({ children, cols = 2 }) {
  return (
    <div className={`grid grid-cols-1 ${cols === 2 ? 'sm:grid-cols-2' : ''} gap-x-6 gap-y-5`}>
      {children}
    </div>
  )
}

const CONTROL =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 transition ' +
  'focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function TextInput({ label, hint, className, ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input className={CONTROL} {...props} />
    </Field>
  )
}

export function SelectInput({ label, hint, children, className, ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select className={CONTROL} {...props}>
        {children}
      </select>
    </Field>
  )
}

/**
 * A read-only label/value pair.
 *
 * The old page rendered values at `text-lg font-semibold` -- larger and heavier
 * than the labels above them, which made a read-only profile look like a stack
 * of headlines. Here the label is the quiet one and the value is normal body
 * text, which is the usual convention for a details list.
 */
export function ReadField({ label, value, mono = false, className = '' }) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div className={className}>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={`mt-1 text-sm text-slate-900 ${mono ? 'font-mono' : ''} ${
          empty ? 'text-slate-400' : ''
        }`}
      >
        {empty ? '—' : value}
      </dd>
    </div>
  )
}

/**
 * Status pill.
 *
 * `tone` is chosen by the caller from the data's meaning rather than guessed
 * from the string, so an unknown status degrades to neutral grey instead of
 * being coloured wrongly.
 */
export function Pill({ tone = 'neutral', children }) {
  const tones = {
    positive: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    negative: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** A checkbox with its label, used for the hospital's service toggles. */
export function CheckboxField({ label, ...props }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
        {...props}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

/**
 * Read-only view of a boolean service flag.
 *
 * The old version painted every enabled service in filled green, so a hospital
 * with four services on produced a row of loud green blocks. A dot carries the
 * same on/off information without shouting.
 */
export function ServiceState({ label, on }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
      />
      <span className={`text-sm ${on ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
}
