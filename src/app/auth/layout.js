/**
 * Passthrough.
 *
 * This used to wrap every auth page in a `max-w-lg` card with its own heading
 * and `max-h-[90vh] overflow-y-auto`. That meant no auth page could ever own
 * its own screen -- a full-width layout got squeezed into a 512px box and
 * clipped, and every page inherited a duplicate "Smile Returns" title on top of
 * whatever heading it rendered itself.
 *
 * Each page now lays itself out.
 */
export default function AuthLayout({ children }) {
  return children
}
