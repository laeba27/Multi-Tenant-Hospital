import Image from 'next/image'

/**
 * The Smile Return logo, in one place.
 *
 * Before this, every surface drew its own stand-in -- an `Activity` lucide icon
 * in an indigo rounded square on the auth screens, the letters "HMP" in the
 * dashboard navbar. Those were placeholders, and they disagreed with each
 * other. Routing every appearance through one component means the artwork, its
 * sizing and its alt text stay consistent, and a future logo change is a single
 * file.
 *
 * Two assets, because one image cannot serve both jobs:
 *   - `logo-mark.png`  the tooth alone, square. For small or tight spots -- a
 *     navbar, a favicon, anywhere the wordmark would be an illegible smudge.
 *   - `logo.png`       tooth plus "Smile Return" wordmark, for wide placements.
 *
 * `priority` is set on the auth/landing usages via the prop rather than always:
 * these are above the fold there, but preloading every instance would waste
 * bandwidth on dashboards where the logo is incidental.
 */
export function Logo({
  variant = 'mark',
  size = 36,
  className = '',
  priority = false,
}) {
  const isFull = variant === 'full'
  const src = isFull ? '/logo.png' : '/logo-mark.png'

  // The full lockup is roughly 1080x1012 -- close to square but not quite, so
  // derive the width from the real ratio instead of forcing a square box and
  // letting the artwork squash.
  const width = isFull ? Math.round(size * (1080 / 1012)) : size
  const height = size

  return (
    <Image
      src={src}
      alt="Smile Return"
      width={width}
      height={height}
      priority={priority}
      className={`object-contain ${className}`}
    />
  )
}

/**
 * Logo plus wordmark set in type.
 *
 * The bitmap wordmark inside logo.png does not stay crisp at small sizes and
 * cannot inherit the surrounding text colour -- on the dark auth rail it would
 * be locked to its own palette. So for inline brand rows we pair the square
 * mark with real text, which stays sharp and themeable.
 */
export function LogoWordmark({
  size = 32,
  className = '',
  textClassName = '',
  priority = false,
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} priority={priority} />
      <span className={`font-semibold tracking-tight ${textClassName}`}>
        Smile Return
      </span>
    </span>
  )
}

export default Logo
